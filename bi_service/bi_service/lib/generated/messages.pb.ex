defmodule Messages.QueryMessage do
  @moduledoc false

  use Protobuf,
    full_name: "messages.QueryMessage",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :query, 1, type: :string
end

defmodule Messages.ResponseMessage do
  @moduledoc false

  use Protobuf,
    full_name: "messages.ResponseMessage",
    protoc_gen_elixir_version: "0.16.0",
    syntax: :proto3

  field :res, 1, type: :string
end

defmodule Messages.MessageService.Service do
  @moduledoc false

  use GRPC.Service, name: "messages.MessageService", protoc_gen_elixir_version: "0.16.0"

  rpc :sendMessage, Messages.QueryMessage, Messages.ResponseMessage
end

defmodule Messages.MessageService.Stub do
  @moduledoc false

  use GRPC.Stub, service: Messages.MessageService.Service
end
