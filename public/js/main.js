// FRONT-END (CLIENT) JAVASCRIPT HERE

const form = document.querySelector('#task-form')
const taskList = document.querySelector('#task-list')
const editor = document.querySelector('#editor')
const editForm = document.querySelector('#edit-form')
const cancelEditButton = document.querySelector('#cancel-edit')

const displayTasks = function(tasks) {
  taskList.innerHTML = tasks.map(item => `
    <tr>
      <td>${item.task}</td>
      <td>${item.creationDate}</td>
      <td>${item.deadline}</td>
      <td>${item.status}</td>
      <td>${item.timeToComplete}</td>
      <td><button id="edit-button" class="edit-button" data-id="${item.id}">Edit</button></td>
      <td><button id="delete-button" class="delete-button" data-id="${item.id}">Delete</button></td>
    </tr>
  `).join('')
}

const loadTasks = async function() {
  const response = await fetch('/data')
  displayTasks(await response.json())
}
const submit = async function( event ) {
  // stop form submission from trying to load
  // a new .html page for displaying results...
  // this was the original browser behavior and still
  // remains to this day
  event.preventDefault()
  
  const formData = Object.fromEntries(new FormData(form))
  const body = JSON.stringify(formData)
  const response = await fetch( '/data', {
    method:'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  })

  displayTasks(await response.json())
  form.reset()
}

form.addEventListener('submit', submit)
taskList.addEventListener('click', async function(event) {
  if (!event.target.classList.contains('delete-button') && !event.target.classList.contains('edit-button')) {
    return
  }
  if (event.target.classList.contains('delete-button')) {
    const response = await fetch(`/delete/${event.target.dataset.id}`, {
    method: 'DELETE'
  })
  displayTasks(await response.json())
  }

  if (event.target.classList.contains('edit-button')) {
    const taskId = parseInt(event.target.dataset.id)
    
    const res = await fetch('/data')
    const tasks = await res.json()
    const targetTask = tasks.find(item => item.id === taskId)

    if (targetTask) {
      document.querySelector('#edit-id').value = targetTask.id
      document.querySelector('#edit-task').value = targetTask.task
      document.querySelector('#edit-deadline').value = targetTask.deadline
      document.querySelector('#edit-status').value = targetTask.status
      
      editor.style.display = 'flex'
    }
  }
})
cancelEditButton.addEventListener('click', () => {
  editor.style.display = 'none'
})

editForm.addEventListener('submit', async function(event) {
  event.preventDefault()
  editor.style.display = 'none'
  const id = document.querySelector('#edit-id').value
  const updatedData = {
    task: document.querySelector('#edit-task').value,
    deadline: document.querySelector('#edit-deadline').value,
    status: document.querySelector('#edit-status').value
  }

  const response = await fetch(`/edit/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  })

  displayTasks(await response.json())
})

loadTasks()