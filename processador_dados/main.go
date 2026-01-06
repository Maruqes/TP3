package main

import (
	"processador_dados/rabbitmq"
	"processador_dados/services"
)

func main() {
	services.SetupService()
	go func() {
		if err := services.StartWebhookServer(); err != nil {
			panic(err)
		}
	}()
	rabbitmq.ConsumirCoelho()
}
