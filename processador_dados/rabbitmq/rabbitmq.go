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

	_, err = ch.QueueDeclare(
		queue,
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("QueueDeclare: %v", err)
	}

	if err := ch.Qos(10, 0, false); err != nil {
		log.Fatalf("Qos: %v", err)
	}

	msgs, err := ch.Consume(
		queue,
		"go-consumer-1",
		false,
		false,
		false,
		false,
		nil,
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

			log.Printf("msg: deliveryTag=%d body=%s", d.DeliveryTag, string(d.Body))
			go func() {
				err := services.Logica(string(d.Body))
				if err != nil {
					fmt.Println(err.Error())
				}
			}()
			if err := d.Ack(false); err != nil {
				log.Printf("ack erro: %v", err)
			}
		}
	}
}
