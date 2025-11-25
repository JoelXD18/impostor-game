const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const words = JSON.parse(fs.readFileSync(__dirname + "/words.json"));

app.use(express.static(__dirname + "/../client"));

let players = [];
let impostorId = null;
let secretWord = "";
let turnIndex = 0;
let gameStarted = false;

function nextTurn() {
    if (players.filter(p => p.alive).length <= 1) return null;
    do {
        turnIndex = (turnIndex + 1) % players.length;
    } while (!players[turnIndex].alive);
    return players[turnIndex].id;
}

function checkGameOver() {
    const alive = players.filter(p => p.alive);
    if (alive.length <= 2) {
        const impostorAlive = alive.find(p => p.id === impostorId);
        if (impostorAlive) {
            io.emit("gameOver", { winner: "impostor" });
        } else {
            io.emit("gameOver", { winner: "crew" });
        }
        gameStarted = false;
    }
}

io.on("connection", socket => {
    console.log("Jugador conectado:", socket.id);

    socket.on("joinGame", name => {
        if (gameStarted) return;
        players.push({ id: socket.id, name: name, alive: true });
        io.emit("playersUpdate", players);
    });

    socket.on("startGame", () => {
        if (gameStarted || players.length < 3) return;
        gameStarted = true;

        // Elegir impostor
        const impIndex = Math.floor(Math.random() * players.length);
        impostorId = players[impIndex].id;

        // Elegir palabra secreta
        secretWord = words[Math.floor(Math.random() * words.length)];

        // Enviar información a cada jugador
        players.forEach(p => {
            if (p.id === impostorId) {
                io.to(p.id).emit("assignRole", { role: "impostor" });
            } else {
                io.to(p.id).emit("assignRole", { role: "crew", word: secretWord });
            }
        });

        const firstTurn = nextTurn();
        io.emit("turn", firstTurn);
    });

    socket.on("sayWord", word => {
        const player = players.find(p => p.id === socket.id);
        if (!player || !player.alive) return;
        io.emit("newWord", { player: player.name, word: word });

        const next = nextTurn();
        io.emit("turn", next);
    });

    socket.on("vote", votedId => {
        players.forEach(p => {
            if (p.id === votedId) {
                p.votes = (p.votes || 0) + 1;
            }
        });

        // Eliminar jugador con más votos
        let maxVotes = -1;
        let eliminated = null;
        players.forEach(p => {
            if ((p.votes || 0) > maxVotes) {
                maxVotes = p.votes;
                eliminated = p;
            }
            p.votes = 0;
        });
        if (eliminated) {
            eliminated.alive = false;
            io.emit("playerEliminated", eliminated);
        }

        checkGameOver();

        const next = nextTurn();
        io.emit("turn", next);
    });

    socket.on("disconnect", () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit("playersUpdate", players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor escuchando en puerto " + PORT));
