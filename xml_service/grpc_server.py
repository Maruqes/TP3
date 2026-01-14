import grpc
from concurrent import futures
import messages_pb2
import messages_pb2_grpc
import json


class MessageServiceServicer(messages_pb2_grpc.MessageServiceServicer):
    def sendMessage(self, request, context):
        """Implementação do RPC sendMessage"""
        print(f"Recebido query: {request.query}")

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
            },
            {
                "title": "Refactoring Harry Code",
                "authors": "Jane Doe",
                "publisher": "Fictional Press",
                "isbn_10": "1234567890",
                "isbn_13": "978-1234567897",
                "description": "A fictional title to validate name search"
            }
        ]

        query_lower = request.query.lower()
        name_marker = "name="
        if name_marker in query_lower:
            start = query_lower.index(name_marker) + len(name_marker)
            raw_tail = request.query[start:].strip()
            if raw_tail.startswith('"'):
                raw_tail = raw_tail[1:]
            if '"' in raw_tail:
                raw_tail = raw_tail.split('"', 1)[0]
            if raw_tail.endswith('"'):
                raw_tail = raw_tail[:-1]
            term = raw_tail.strip().lower()
            matches = [
                book for book in books
                if term and term in book["title"].lower()
            ]
            response_text = json.dumps(matches)
            return messages_pb2.ResponseMessage(res=response_text)
        
        if query_lower == "livros":
            response_text = json.dumps(books)
        elif query_lower == "getallauthors":
            authors = [
                {"name": "Ana Silva"},
                {"name": "Bruno Costa"},
                {"name": "Carla Rocha"},
                {"name": "Daniel Souza"},
                {"name": "Elisa Martins"}
            ]
            response_text = json.dumps(authors)
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
