import grpc
from concurrent import futures
import messages_pb2
import messages_pb2_grpc
import json


class MessageServiceServicer(messages_pb2_grpc.MessageServiceServicer):
    def sendMessage(self, request, context):
        """Implementação do RPC sendMessage"""
        print(f"Recebido query: {request.query}")
        
        if request.query.lower() == "livros":
            books = [
                {
                    "title": "Clean Code",
                    "authors": "Robert C. Martin",
                    "publisher": "Prentice Hall",
                    "isbn_10": "0132350882",
                    "isbn_13": "978-0132350884",
                    "description": "A handbook of agile software craftsmanship"
                },
                {
                    "title": "The Pragmatic Programmer",
                    "authors": "David Thomas, Andrew Hunt",
                    "publisher": "Addison-Wesley",
                    "isbn_10": "020161622X",
                    "isbn_13": "978-0201616224",
                    "description": "Your journey to mastery in software development"
                }
            ]
            response_text = json.dumps(books)
        else:
            response_text = f"Resposta para query: {request.query}"
        
        return messages_pb2.ResponseMessage(res=response_text)

def serve():
    """Inicia o servidor gRPC"""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    messages_pb2_grpc.add_MessageServiceServicer_to_server(
        MessageServiceServicer(), server
    )
    server.add_insecure_port("[::]:50051")
    print("Servidor gRPC iniciado na porta 50051")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
