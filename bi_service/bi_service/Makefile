build:
	protoc \
	--elixir_out=plugins=grpc:./lib/generated \
	-I./lib/priv/protos \
	./lib/priv/protos/*.proto