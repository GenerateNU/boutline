# The desired schema is whatever cmd/atlasloader prints, which is whatever the
# gorm models declare. `atlas migrate diff` compares that against the migrations
# already in ./migrations and writes the difference as the next versioned file.
data "external_schema" "gorm" {
  program = ["go", "run", "-mod=mod", "./cmd/atlasloader"]
}

env "local" {
  src = data.external_schema.gorm.url

  # Throwaway container Atlas uses to normalise the schema before diffing. It
  # is created and dropped per command and never touches the dev stack.
  dev = "docker://postgres/17/dev?search_path=public"

  migration {
    dir = "file://migrations"
  }

  format {
    migrate {
      diff = "{{ sql . \"  \" }}"
    }
  }
}
