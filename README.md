# env_doctor

Vital utility for describing and checking environment variables

## Description

Field **"value"** - is forced value of variable.
The user will not enter it.
The value is immediately assigned to the corresponding variable.  
Not recommended to use this field for private/secure data.

Field **"default"** - is default value of variable.
It is used if the user enters nothing.  
Not recommended to use this field for private/secure data.

## Priority
If the **"value"** field is set, field **"default"** will be ignored.

## License

  [MIT](LICENSE)
