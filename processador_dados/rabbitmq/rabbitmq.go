package rabbitmq

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"os"
	"os/signal"
	"processador_dados/services"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	amqp "github.com/rabbitmq/amqp091-go"
)

func ConsumirCoelho() {
	if err := godotenv.Load(); err != nil {
		log.Println("warning: .env not loaded; using environment variables")
	}
	rabbitURL := os.Getenv("RABBITMQ")
	queue := "tp3"

	// aceitar certificados self-signed
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
	}

	conn, err := amqp.DialTLS(rabbitURL, tlsConfig)
	if err != nil {
		log.Fatalf("dial: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("channel: %v", err)
	}
	defer ch.Close()

	// Garantir que a queue existe (tem de bater certo com o producer)
	_, err = ch.QueueDeclare(
		queue,
		true,  // durable
		false, // autoDelete
		false, // exclusive
		false, // noWait
		nil,   // args
	)
	if err != nil {
		log.Fatalf("QueueDeclare: %v", err)
	}

	// Prefetch: não levar 1000 msgs para a RAM antes de as processares
	if err := ch.Qos(10, 0, false); err != nil {
		log.Fatalf("Qos: %v", err)
	}

	// Consumir com ACK manual (autoAck=false)
	msgs, err := ch.Consume(
		queue,
		"go-consumer-1", // consumer tag
		false,           // autoAck
		false,           // exclusive
		false,           // noLocal (não usado pelo RabbitMQ)
		false,           // noWait
		nil,             // args
	)
	if err != nil {
		log.Fatalf("Consume: %v", err)
	}

	log.Printf("a ouvir mensagens da queue")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("shutdown")
			time.Sleep(200 * time.Millisecond)
			return

		case d, ok := <-msgs:
			if !ok {
				log.Println("canal de consumo fechado")
				return
			}

			// Aqui processas a mensagem
			log.Printf("msg: deliveryTag=%d body=%s", d.DeliveryTag, string(d.Body))
			go func() {
				err := services.Logica(string(d.Body))
				if err != nil {
					fmt.Println(err.Error())
				}
			}()
			// Se correu bem:
			if err := d.Ack(false); err != nil {
				log.Printf("ack erro: %v", err)
			}
		}
	}
}
