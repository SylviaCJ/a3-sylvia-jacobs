const http = require( 'http' ),
      fs   = require( 'fs' ),
      // IMPORTANT: you must run `npm install` in the directory for this assignment
      // to install the mime library if you're testing this on your local machine.
      // On Render, make sure `npm install` is your build command.
      mime = require( 'mime' ),
      dir  = 'public/',
      port = 3000

let appdata = [
  {id: 1, task: 'test task', creationDate: '2026-08-28', deadline: '2026-09-01', status: 'not started', timeToComplete: 3}
]

const timeToComplete = function(creationDate, deadline) {
  const creation = new Date(creationDate)
  const due = new Date(deadline)
  const diffTime = Math.abs(due - creation)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const server = http.createServer( function( request,response ) {
  if( request.method === 'GET' ) {
    handleGet( request, response )    
  }else if( request.method === 'POST' ){
    handlePost( request, response ) 
  } else if (request.method === 'DELETE') {
    handleDelete(request, response)
  } else if (request.method === 'PUT') {
    handleEdit(request, response)
  }
})

const handleGet = function( request, response ) {  
  if (request.url === '/data') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(appdata))
    return
  }
  
  const filename = dir + request.url.slice(1) 

  if( request.url === '/' ) {
    sendFile( response, 'public/index.html' )
  }else{
    sendFile( response, filename )
  }
}

const handlePost = function( request, response ) {
  if (request.url === '/data' || request.url === '/submit') {
    let dataString = ''

    request.on( 'data', function( data ) {
        dataString += data 
    })
    request.on( 'end', function() {
      try {
        const data = JSON.parse(dataString)
        const creationDate = data.creationDate || data['creation-date'] || ''
        const deadline = data.deadline || ''
        const task = {
          id: Date.now(),
          task: data.task,
          creationDate,
          deadline,
          status: data.status,
          timeToComplete: timeToComplete(creationDate, deadline)
        }
        appdata.push(task)
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(appdata))
      } catch (err) {
        response.writeHead(400, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Invalid JSON payload' }))
      } 
    })
  } else {
    response.writeHeader( 404 )
    response.end( '404 Error: Not Found' )
  }
}

const handleDelete = function(request, response) {
  const id = request.url.split('/')[2]
  appdata = appdata.filter(item => item.id !== parseInt(id))
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(appdata))
}

const handleEdit = function(request, response) {

  const id = parseInt(request.url.split('/')[2])
  let dataString = ''

  request.on('data', function(data) {
    dataString += data
  })

  request.on('end', function() {
    try {
      const data = JSON.parse(dataString)
      
      appdata = appdata.map(item => {
        if (item.id === id) {
          const newTimeToComplete = timeToComplete(item.creationDate, data.deadline)
          
          return {
            ...item,
            task: data.task,
            deadline: data.deadline,
            status: data.status,
            timeToComplete: newTimeToComplete
          }
        }
        return item
      })

      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(appdata))
    } catch (err) {
      response.writeHead(400, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: 'Invalid JSON payload' }))
    }
  })
}


const sendFile = function( response, filename ) {
   const type = mime.getType( filename ) 

   fs.readFile( filename, function( err, content ) {

     // if the error = null, then we've loaded the file successfully
     if( err === null ) {

       // status code: https://httpstatuses.com
       response.writeHeader( 200, { 'Content-Type': type })
       response.end( content )

     }else{

       // file not found, error code 404
       response.writeHeader( 404 )
       response.end( '404 Error: File Not Found' )

     }
   })
}

server.listen( process.env.PORT || port )
