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

func getInfoAndFix(sok *Socket, line CsvLine) {
	//escrever csv no disco

	//ler linha de cada csv

	if line.ISBN_13 == "N/A" {
		fmt.Println("NO ISBN")
		return
	}
	desc, smallThumb, thumb, err := apiexterna.GetLivroDescription(line.ISBN_13)
	if err != nil {
		fmt.Println(err.Error())
	} else {
		line.Description = *desc
		line.smallThumbnail = *smallThumb
		line.thumbnail = *thumb
	}

	toSend := line.ToCSV()
	toSend = toSend + "\n"
	err = SendSocketMessage(sok, toSend)
	if err != nil {
		fmt.Println(err.Error())
		return
	}
	fmt.Println(toSend)

	//apagar csv do disco com webhook
}

func Logica(filepath string) error {
	sok, err := setupSocket()
	if err != nil {
		return err
	}
	defer CloseSocket(sok)

	ctx := context.Background()
	obj, err := b.GetFileFromBalde(ctx, filepath)
	if err != nil {
		return fmt.Errorf("failed to get file from balde: %w", err)
	}

	//mandar header
	filename := filepath

	// mapperv1 := `{"root":"books","item":"book","schema":{"title":"title","authors":"authors","publisher":"publisher","language":"language","ISBN":{"isbn_10":"isbn_10","isbn_13":"isbn_13"},"description":"description"}}`

	//Versão com thumbnails
	mapperv2 := `{"root":"books","item":"book","schema":{"title":"title","authors":"authors","publisher":"publisher","language":"language","ISBN":{"isbn_10":"isbn_10","isbn_13":"isbn_13"},"description":"description","thumbnails":{"smallThumbnail":"smallThumbnail","thumbnail":"thumbnail"}}}`

	webhook := "http://webhook-1611663047.eu-north-1.elb.amazonaws.com/webhook"

	requestID := uuid.New()
	headerMsg := fmt.Sprintf(`{"request_id":"%s","mapper":%s,"webhook_url":"%s","filename":"%s"}`+"\n", requestID, mapperv2, webhook, filename)
	if err := SendSocketMessage(sok, headerMsg); err != nil {
		return err
	}

	//mandar colunas
	err = SendSocketMessage(sok, "title,authors,publisher,language,isbn_10,isbn_13,description,smallThumbnail,thumbnail\n")
	if err != nil {
		return err
	}

	//madar uma linha de cada vez
	err = parseCsvLine(sok, obj.Body, getInfoAndFix)
	if err != nil {
		return err
	}

	//dizer que acabou tudo
	err = SendSocketMessage(sok, "endacabadofinalizadoanimalesco")
	if err != nil {
		return err
	}
	return nil
}
