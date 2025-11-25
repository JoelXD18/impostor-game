const socket = io();

let myId = null;

const loginDiv = document.getElementById("login");
const gameDiv = document.getElementById("game");
const nameInput = document.getElementById("nameInput");
const joinBtn = document.getElementById("joinBtn");
const roleInfo = document.getElementById("roleInfo");
const playersList = document.getElementById("playersList");
const wordsList = document.getElementById("wordsList");
const turnDiv = document.getElementById("turnDiv");
const wordInput = document.getElementById("wordInput");
const sendWordBtn = document.getElementById("sendWordBtn");
const voteList = document.getElementById("voteList");
const gameOverDiv = document.getElementById("gameOver");
const winnerText = document.getElementById("winnerText");

joinBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return;
    socket.emit("joinGame", name);
    loginDiv.style.display = "none";
    gameDiv.style.display = "block";
    myId = socket.id;
};

sendWordBtn.onclick = () => {
    const word = wordInput.value.trim();
    if (!word) return;
    socket.emit("sayWord", word);
    wordInput.value = "";
    turnDiv.style.display = "none";
};

socket.on("playersUpdate", players => {
    playersList.innerHTML = "";
    voteList.innerHTML = "";
    players.forEach(p => {
        const li = document.createElement("li");
        li.textContent = p.name + (p.alive ? "" : " (eliminado)");
        playersList.appendChild(li);

        if (p.alive) {
            const voteBtn = document.createElement("button");
            voteBtn.textContent = "Votar";
            voteBtn.onclick = () => {
                socket.emit("vote", p.id);
            };
            const voteLi = document.createElement("li");
            voteLi.textContent = p.name + " ";
            voteLi.appendChild(voteBtn);
            voteList.appendChild(voteLi);
        }
    });
});

socket.on("assignRole", data => {
    if (data.role === "impostor") {
        roleInfo.textContent = "Eres el IMPOSTOR!";
    } else {
        roleInfo.textContent = "Tu palabra es: " + data.word;
    }
});

socket.on("turn", playerId => {
    if (playerId === socket.id) {
        turnDiv.style.display = "block";
    } else {
        turnDiv.style.display = "none";
    }
});

socket.on("newWord", data => {
    const li = document.createElement("li");
    li.textContent = data.player + ": " + data.word;
    wordsList.appendChild(li);
});

socket.on("playerEliminated", player => {
    alert(player.name + " fue eliminado!");
});

socket.on("gameOver", data => {
    gameOverDiv.style.display = "block";
    winnerText.textContent = data.winner === "impostor" ? "El impostor gana!" : "Los tripulantes ganan!";
});
