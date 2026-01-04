import socket

from xml_processor import handle_client


HOST = "0.0.0.0"
PORT = 9000


def main():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
        server.bind((HOST, PORT))
        server.listen(1)
        server.settimeout(1.0)
        print(f"Active on {HOST}:{PORT}")
        try:
            while True:
                try:
                    conn, addr = server.accept()
                except socket.timeout:
                    continue
                handle_client(conn, addr)
        except KeyboardInterrupt:
            print("closed")


if __name__ == "__main__":
    main()
