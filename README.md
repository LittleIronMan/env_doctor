## env_doctor

Vital utility for describing and checking environment variables.  
Let's start describing environment variables together :two_men_holding_hands:  
> :point_right: The envconfig file with the description of variables can also be imported into your typescript code :point_left:

# Config example

`envConfig.json` file of main module **my-nodejs-server**:

```json
{
    "module": {
        "name": "my-nodejs-server",
        "dependencies": {
            "couch": "../couch_db",
            "pg": "../postgres_db"
        },
        "comment": "There may be a description of your module with variables here. The script does not use this information."
    },
    "config": {
        "MY_MAGIC_VAR": {
            "desc": "British scientists have found that the description of an environment variable helps the developer better understand its purpose than the absence of this description.",
            "value": "Forced value 1.618034"
        },
        "AMAZING_VAR": {
            "desc": [
                "Multiline description example, line #1",
                "line #2"
            ],
            "default": "Default value 3.141592"
        },
        "POSTGRES_PORT": {
            "value": "5432"
        },
        "POSTGRES_PASSWORD": {
            "refTo": "pg.POSTGRES_PASSWORD",
        },
        "COUCHDB_PASSWORD": {
            "refTo": "couch.COUCHDB_PASSWORD"
        }
    }
}
```

## `module` block
## `config` block
- **"desc"** - Variable description, very useful if you are not psychic

- **"default"** - Default value of variable.
It is used if user enters nothing (i.e. empty line `""`).  
*:exclamation: Not recommended to use this field for private/secret data.*

- **"value"** - Forced value of variable.
The user will not enter it.
The value is immediately assigned to the corresponding variable.  
*:exclamation: Not recommended to use this field for private/secret data.*

- **"refTo"** - The config of this variable refers to the variable from dependencies list. Template: `<moduleAlias>.<externalVarName>`. Example: `myDatabase.DB_PASSWORD`. If the variable is not found in the child module, an error will be thrown.

- **"secret"** - if `true` - value of the variable will not be displayed on the screen when typing it from the keyboard. Also warnings will be displayed if you mistakenly set the "value" or "default" fields

- **"optional"** - if `true` - and if the value of the variable is empty string, this variable will not be saved in the .env file

- **"clearBefore"** - if `true` - value of the variable in the corresponding .env file will be CLEARED before checking

## Priority

If **"value"** field is set, field **"default"** will be ignored.

## License

[MIT](LICENSE)
