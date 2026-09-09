require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');


const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db = null;
let collection = null;

const timeToComplete = function(creationDate, deadline) {
  const creation = new Date(creationDate)
  const due = new Date(deadline)
  const diffTime = Math.abs(due - creation)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/data', async function(request, response) {
  try {
    const username = request.query.username || "guest"; 
    const userTasks = await collection.find({ username: username }).toArray();
    response.json(userTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to fetch data" });
  }
});


app.post(['/data', '/submit'], async function(request, response) {
  try {
    const data = request.body;
    const creationDate = data.creationDate || data['creation-date'] || '';
    const deadline = data.deadline || '';
    const username = data.username || "guest"; 

    const task = {
      username, 
      task: data.task,
      creationDate,
      deadline,
      status: data.status,
      timeToComplete: timeToComplete(creationDate, deadline)
    };

    await collection.insertOne(task);
    
    const updatedTasks = await collection.find({ username: username }).toArray();
    response.json(updatedTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to insert data" });
  }
});

app.delete('/delete/:id', async function(request, response) {
  try {
    const id = request.params.id;
    const username = request.query.username || "guest"; 
    
    await collection.deleteOne({ _id: new ObjectId(id), username: username });
    
    const updatedTasks = await collection.find({ username: username }).toArray();
    response.json(updatedTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to delete data" });
  }
});

app.put('/edit/:id', async function(request, response) {
  try {
    const id = request.params.id;
    const data = request.body;
    const username = data.username || "guest";

    const existingTask = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingTask) {
      return response.status(404).json({ error: "task not found" });
    }

    await collection.updateOne(
      { _id: new ObjectId(id), username: username },
      {
        $set: {
          task: data.task,
          deadline: data.deadline,
          status: data.status,
          timeToComplete: timeToComplete(existingTask.creationDate, data.deadline)
        }
      }
    );

    const updatedTasks = await collection.find({ username: username }).toArray();
    response.json(updatedTasks);
  } catch (error) {
    response.status(500).json({ error: "failed to update data" });
  }
});

async function run() {
  try {
    await client.connect();
    db = client.db("a3db");
    collection = db.collection("tasks");
    console.log("connected");

    app.listen(port, function() {
      console.log(`Server is listening on port ${port}`);
    });
  } catch (err) {
    console.error("couldnt connect to db", err);
    process.exit(1);
  }
}

run();
