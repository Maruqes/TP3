package services

import (
	"encoding/csv"
	"io"
)

type CsvLine struct {
	title       string
	authors     string
	publisher   string
	lang        string
	ISBN_10     string
	ISBN_13     string
	Description string
	smallThumbnail string
	thumbnail      string
}

func (c *CsvLine) Print() {
	out := "Title: " + c.title +
		"\nAuthors: " + c.authors +
		"\nPublisher: " + c.publisher +
		"\nLanguage: " + c.lang +
		"\nISBN-10: " + c.ISBN_10 +
		"\nISBN-13: " + c.ISBN_13 +
		"\nDescription: " + c.Description +
		"\nSmall Thumbnail: " + c.smallThumbnail +
		"\nThumbnail: " + c.thumbnail + "\n"
	println(out)
}

func sanitizeCSVField(s string) string {
	if s == "" {
		return s
	}
	runes := []rune(s)
	for i, ch := range runes {
		if ch == ',' {
			runes[i] = '|'
		}
	}
	return string(runes)
}

func (c *CsvLine) ToCSV() string {
	return sanitizeCSVField(c.title) + "," +
		sanitizeCSVField(c.authors) + "," +
		sanitizeCSVField(c.publisher) + "," +
		sanitizeCSVField(c.lang) + "," +
		sanitizeCSVField(c.ISBN_10) + "," +
		sanitizeCSVField(c.ISBN_13) + "," +
		sanitizeCSVField(c.Description) + "," +
		sanitizeCSVField(c.smallThumbnail) + "," +
		sanitizeCSVField(c.thumbnail)
}

func parseCsvLine(sok *Socket, csvIO io.ReadCloser, callback func(sok *Socket, line CsvLine)) error {
	reader := csv.NewReader(csvIO)
	first := false
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if !first {
			first = true
			continue
		}
		newLine := CsvLine{
			title:     record[0],
			authors:   record[1],
			publisher: record[2],
			lang:      record[3],
			ISBN_10:   record[4],
			ISBN_13:   record[5],
		}
		callback(sok, newLine)
	}
	return nil
}
