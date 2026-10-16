# Cliq backend

Cliq is a social app for teenagers. People share text, photos and videos,
upgrade (like) each other's posts, and find friends who share their interests.

This folder holds the backend: the part that stores data and files. It keeps
everything inside Telegram, so there is no database to rent and no monthly bill.

This is a separate project from the website in the parent folder. They do not
interfere with each other. The website is the front end. This folder is the back
end.

## What gramobase does

gramobase is a tool that turns a Telegram channel into a database.

Think of a Telegram channel like a filing cabinet. Each drawer in the cabinet is
a collection, such as users or posts. Each message you post in the channel is one
row of data in that drawer. Telegram also stores files for free, so photos and
videos go there too.

gramobase handles the fiddly parts for you: reading, writing, searching, and
recovering after a crash. You talk to it with simple commands like insertOne and
find. Under the hood it uses your Telegram bot to send and read channel messages.

Because of this, the whole backend costs nothing to run.

## How to set up the .env file

The app needs three secrets. They live in a file called .env, which is never
shared or committed.

1. Copy the example file to a real one:

   cp .env.example .env

2. Open .env in a text editor and replace the placeholder values:

   - BOT_TOKEN: your Telegram bot token. Create a bot with @BotFather in
     Telegram. It takes about 30 seconds and returns a token.
   - CHANNEL_ID: the id of a private Telegram channel. Add your bot to that
     channel as an administrator with full permissions.
   - JWT_SECRET: any long random string. It will sign login sessions later.

3. Save the file.

The .env file is ignored by git, so your secrets stay on your machine.

## How to run the project

Install the packages once:

   npm install

Then start the app:

   npm start

You should see:

   Cliq backend starting...
   Telegram connection OK. Cliq backend is ready.

If the settings are missing, the app explains what to fix instead of crashing.

## What each folder is for

- src/index.ts: the starting point. It loads settings and checks the Telegram
  connection.
- src/db/telegram.ts: opens the connection to Telegram and shares it with the
  rest of the code.
- src/schemas/index.ts: describes the shape of each kind of record, such as
  users and posts. It rejects bad data before it is saved.
- src/lib/types.ts: TypeScript types generated from the schemas, plus the
  collection names.
- .env.example: a safe template showing which settings you need. It holds no
  real values.
- .gitignore: tells git to ignore node_modules, .env and dist.

## What comes next

This step only sets up the project and checks the connection. The API endpoints
come later.
