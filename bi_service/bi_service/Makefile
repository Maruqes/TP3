PROTO_DIR := ./lib/priv/protos
GEN_DIR := ./lib/generated
PROTO_FILES := $(wildcard $(PROTO_DIR)/*.proto)

.PHONY: build protos compile

build: protos compile

protos:
	mkdir -p $(GEN_DIR)
	protoc \
	--elixir_out=plugins=grpc:$(GEN_DIR) \
	-I$(PROTO_DIR) \
	$(PROTO_FILES)

compile:
	mix compile
