package services

import (
	"errors"
	"net"
	"sync"
)

const socketAddr = "127.0.0.1:9000"

var (
	socketConn net.Conn
	socketMu   sync.Mutex
)

func setupSocket() error {
	if socketConn != nil {
		return nil
	}
	conn, err := net.Dial("tcp", socketAddr)
	if err != nil {
		return err
	}
	socketConn = conn
	return nil
}

func SendSocketMessage(message string) error {
	socketMu.Lock()
	defer socketMu.Unlock()
	if socketConn == nil {
		return errors.New("socket connection not initialized")
	}
	if len(message) == 0 || message[len(message)-1] != '\n' {
		message += "\n"
	}
	_, err := socketConn.Write([]byte(message))
	return err
}

func CloseSocket() error {
	socketMu.Lock()
	defer socketMu.Unlock()
	if socketConn == nil {
		return nil
	}
	err := socketConn.Close()
	socketConn = nil
	return err
}
