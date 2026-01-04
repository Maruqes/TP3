package main

import (
	"processador_dados/rabbitmq"
	"processador_dados/services"
)

func main() {
	services.SetupService()
	rabbitmq.ConsumirCoelho()
}
