defmodule BiService.Logic do
  use Absinthe.Schema

  # receber um graphql query e usar resolvers
  object :book do
    field(:title, :string)
    field(:authors, :string)
    field(:publisher, :string)
    field(:isbn_10, :string)
    field(:isbn_13, :string)
    field(:isbn10, :string)
    field(:isbn13, :string)
    field(:description, :string)
    field(:small_thumbnail, :string)
    field(:thumbnail, :string)
  end

  object :author do
    field(:name, :string)
  end

  query do
    field :books, list_of(:book) do
      resolve(&BiService.ApiGraphql.list_books/3)
    end

    field :search_by_name, list_of(:book) do
      arg(:name, non_null(:string))
      resolve(&BiService.ApiGraphql.search_by_name/3)
    end

    field :search_by_author, list_of(:book) do
      arg(:author, non_null(:string))
      resolve(&BiService.ApiGraphql.search_by_author/3)
    end

    field :get_authors, list_of(:author) do
      resolve(&BiService.ApiGraphql.get_authors/3)
    end
  end
end
