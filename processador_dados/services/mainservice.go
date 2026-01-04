package services

import (
	"context"
	"fmt"
	apiexterna "processador_dados/api_externa"
	"processador_dados/bucket"

	"github.com/google/uuid"
)

var b *bucket.Balde

func SetupService() {
	ba, err := bucket.SetupBucket()
	if err != nil {
		panic(err)
	}
	b = ba
}

func getInfoAndFix(line CsvLine) {
	//escrever csv no disco

	//ler linha de cada csv

	if line.ISBN_13 == "N/A" {
		fmt.Println("NO ISBN")
		return
	}
	desc, err := apiexterna.GetLivroDescription(line.ISBN_13)
	if err != nil {
		fmt.Println(err.Error())
	} else {
		line.Description = *desc
	}

	toSend := line.ToCSV()
	toSend = toSend + "\n"
	err = SendSocketMessage(toSend)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	fmt.Println(toSend)

	//apagar csv do disco com webhook
}

func Logica(filepath string) error {
	if err := setupSocket(); err != nil {
		return err
	}
	defer CloseSocket()

	ctx := context.Background()
	obj, err := b.GetFileFromBalde(ctx, filepath)
	if err != nil {
		return fmt.Errorf("failed to get file from balde: %w", err)
	}

	//mandar header
	filename := filepath

	mapperv1 := `{"root":"books","item":"book","schema":{"title":"title","authors":"authors","publisher":"publisher","language":"language","ISBN":{"isbn_10":"isbn_10","isbn_13":"isbn_13"},"description":"description"}}`
	webhook := "https://example.com/webhook"

	requestID := uuid.New()
	headerMsg := fmt.Sprintf(`{"request_id":"%s","mapper":%s,"webhook_url":"%s","filename":"%s"}`+"\n", requestID, mapperv1, webhook, filename)
	if err := SendSocketMessage(headerMsg); err != nil {
		return err
	}

	//mandar colunas
	err = SendSocketMessage("title,authors,publisher,language,isbn_10,isbn_13,description\n")
	if err != nil {
		return err
	}

	//madar uma linha de cada vez
	err = parseCsvLine(obj.Body, getInfoAndFix)
	if err != nil {
		return err
	}

	//dizer que acabou tudo
	err = SendSocketMessage("endacabadofinalizadoanimalesco")
	if err != nil {
		return err
	}
	return nil
}
