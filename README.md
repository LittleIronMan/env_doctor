## env_doctor

Vital utility for describing and checking environment variables.  
Let's start describing environment variables together :two_men_holding_hands:  
> :point_right: The `envConfig.json` file with the description of variables can also be imported into your typescript code :point_left:

# Config example

<!-- https://github.com/ikatyang/emoji-cheat-sheet -->
Files are located like this:  
:file_folder: project\
│\
├─ :file_folder: nodejs\
│ &nbsp; &nbsp;└─ :page_facing_up: envConfig.json\
│\
├─ :file_folder: couch_db\
│ &nbsp; &nbsp;└─ :page_facing_up: envConfig.json\
│\
└─ :file_folder: postgres_db\
 &nbsp; &nbsp; &nbsp; └─ :page_facing_up: envConfig.json

**Main** module `nodejs/envConfig.json` file:

```json
{
  "module": {
    "name": "my-nodejs-server",
    "dependencies": {
      "couch": "../couch_db",
      "pg": "../postgres_db"
    },
    "comment": "There may be a description of your module with variables here. Script does not use this information."
  },
  "config": {
    "AMAZING_VAR": {
      "desc": "Single line with variable description",
      "default": "Default value 3.141592"
    },
    "MY_MAGIC_VAR": {
      "desc": [
        "Multiline description example.",
        "British scientists have found that",
        "describing environment variables in one file",
        "is pretty damn convenient thing."
      ],
      "value": "Forced value 1.618034"
    },
    "POSTGRES_PORT": {
      "value": "5432"
    },
    "POSTGRES_PASSWORD": {
      "refTo": "pg.POSTGRES_PASSWORD"
    },
    "COUCHDB_PASSWORD": {
      "refTo": "couch.COUCHDB_PASSWORD"
    }
  }
}
```

# Specification of `envConfig.json`

## `module: {}` block

- `"name"` - **Required**. Module name. The output .env file name is generated from the module name as follows: `_<module_name>.env`. Example: module name `database1`, output file `_database1.env`.
- `"dependencies: { ... }"` - *Optional*. List of links to related modules. Parent modules can use variable configs from child modules (description, default value). Variable values are synchronized between parent and child modules.

## `config: {}` block
- `"desc"` - *Optional*. Variable description, very useful if you are not psychic.

- `"default"` - *Optional*. Default value of variable.
It is used if user enters nothing (i.e. empty line `""`).  
:warning: *Not recommended to use this field for private/secret data.*

- `"value"` - *Optional*. Forced value of variable.
The user will not enter it.
The value is immediately assigned to the corresponding variable.  
:warning: *Not recommended to use this field for private/secret data.*

- `"refTo"` - *Optional*. The config of this variable refers to the variable from dependencies list. Template: `<moduleAlias>.<externalVarName>`. Example: `myDatabase.DB_PASSWORD`. If the variable is not found in the child module, an error will be thrown.

- `"secret"` - *Optional*. If `true` - value of the variable will not be displayed on the screen when typing it from the keyboard. Also warnings will be displayed if you mistakenly set the "value" or "default" fields.

- `"optional"` - *Optional*. If `true` - and if the value of the variable is empty string, this variable will not be saved in the .env file.

- `"clearBefore"` - *Optional*. If `true` - value of the variable in the corresponding .env file will be CLEARED before running the check algorithm.

## Priority

If `"value"` field is set, field `"default"` will be ignored.

## License

[MIT](LICENSE)
