require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 7000;

// Middlewares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bu1vbif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // =============[jwt related API]==============
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2d' });
            res.send({ token });
        });

        // =============[Bistro related API]============
        // Database collections
        const userCollection = client.db('BistroDB').collection('users');
        const menuCollection = client.db('BistroDB').collection('menu');
        const reviewCollection = client.db('BistroDB').collection('reviews');
        const cartCollection = client.db('BistroDB').collection('carts');
        

        // ---athorization related middlewares---
        // Verify the token
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unathorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            // console.log('token', token)
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'unathorized access' });
                }
                req.decoded = decoded;
                next();
            });
        };

        // Verify the Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };

        // -----------[User related API]---------------
        // Read the users from the database
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        // Read the admin data from the database
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const verifiedEmail = req.decoded.email;
            console.log('verified email', req.decoded);
            if (email !== verifiedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        // Create the user to the database
        app.post('/users', async (req, res) => {
            const user = req.body;
            // Check user if exist 
            const query = { email: user.email };
            const isExist = await userCollection.findOne(query);
            if (isExist) {
                return res.status(409).send({ message: 'user already exist', insertedId: null })
            }

            // Insert the new user to the db
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Update a single data to the db
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Delete the specific user from the db
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        });

        // -------------[Items related API]--------------
        // Read the menu items from the database
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        });

        // Read a single data from the database
        app.get('/menu/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: id};
            const result = await menuCollection.findOne(query);
            res.send(result);
        });

        // Create the menu item to the database
        app.post('/menu', verifyToken, verifyAdmin, async(req, res) => {
            const menu = req.body;
            const result = await menuCollection.insertOne(menu);
            res.send(result);
        });

        // Update a single data to the database
        app.patch('/menu/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: id};
            const item = req.body;
            const updatedDoc = {
                $set: {
                    ...item
                }
            };
            const result = await menuCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Delete the menu item from the database
        app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = {_id: id};
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        });

        // Read the review items from the database
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        });

        // -----------------------------------
        // Read the cart data from the database
        app.get('/carts', async (req, res) => {
            const email = req?.query?.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        });

        // Create the cart collection to the database
        app.post('/carts', async (req, res) => {
            const cart = req.body;
            const result = await cartCollection.insertOne(cart);
            res.send(result);
        });

        // Delete the specific cart data from the database
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(filter);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



// Check the server
app.get('/', (req, res) => {
    res.send('The Restaurant bistro boss server is running.......');
});

// Listen the server
app.listen(port, () => {
    console.log(`The bistro boss running on port: ${port}`);
});