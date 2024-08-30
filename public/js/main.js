const socket = io();

document.getElementById('send-button').addEventListener('click', () => {
    const message = document.getElementById('message-input').value;
    const recipient = document.getElementById('user-select').value;
    socket.emit('chatMessage', { message, recipient });
    document.getElementById('message-input').value = '';
});

socket.on('message', ({ sender, message }) => {
    const chatBox = document.getElementById('group-chat');
    const msgElement = document.createElement('p');
    msgElement.textContent = `${sender}: ${message}`;
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on('privateMessage', ({ sender, message }) => {
    const chatBox = document.getElementById('private-chat');
    const msgElement = document.createElement('p');
    msgElement.textContent = `${sender}: ${message}`;
    chatBox.appendChild(msgElement);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// Fetch list of users for private messaging
socket.on('userList', users => {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.username;
        userSelect.appendChild(option);
    });
});
