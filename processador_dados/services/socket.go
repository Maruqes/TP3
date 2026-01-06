package services

import (
	"errors"
	"net"
	"sync"
)

const socketAddr = "127.0.0.1:9000"

type Socket struct {
	conn net.Conn
	mu   sync.Mutex
}

func setupSocket() (*Socket, error) {
	var sok Socket

	conn, err := net.Dial("tcp", socketAddr)
	if err != nil {
		return nil, err
	}
	sok.conn = conn
	return &sok, nil
}

func SendSocketMessage(sok *Socket, message string) error {
	sok.mu.Lock()
	defer sok.mu.Unlock()
	if sok.conn == nil {
		return errors.New("socket connection not initialized")
	}
	if len(message) == 0 || message[len(message)-1] != '\n' {
		message += "\n"
	}
	_, err := sok.conn.Write([]byte(message))
	return err
}

func CloseSocket(sok *Socket) error {
	sok.mu.Lock()
	defer sok.mu.Unlock()
	if sok.conn == nil {
		return nil
	}
	err := sok.conn.Close()
	sok.conn = nil
	return err
}
