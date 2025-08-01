To start the backend locally run the commands
1. ` cd backend `
2. ` npm install `
before running the 3rd command put DATABASEURL AND JWT Token in .env 
3. ` npx prisma migrate deploy `
4. ` node src/index.js `

To start the frontend locally run the commands
1. ` cd frontend `
2. ` npm install `
3. ` npm run dev ` 

Using docker to run postgreSQL + prisma ORM locally