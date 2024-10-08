const { log } = require("console");
const { createServer } = require("http");
const { Server } = require("socket.io");
const PORT = 3000;
const httpServer = createServer();
const io = new Server(httpServer, {  cors: {
    origin: "*",
    methods: ["*"]
  },
 });

let totalPlayers = 0;
let players = {};
let waiting = {
    '10' : [],
    '15' : [],
    '20' : []
};
let matches = {
    '10' : [],
    '15' : [],
    '20' : []
};

function removeSocketFromWaitingPeriod(socket){
    const forEachLoop = [10,15,20];
    forEachLoop.forEach((element) => {
        const index =  waiting[element].indexOf(socket.id);
    if(index>-1){
        waiting[element].splice(index,1);
    }
    });
    
    
}

function fireTotalPlayers(){
     io.emit('total_players_count_change',totalPlayers);    
}
function fireOnDisconnect(socket){
    removeSocketFromWaitingPeriod(socket.id);
    totalPlayers--;
    fireTotalPlayers();
}

function initialSetupMatch(opponentId,socketId,time){
  players[opponentId].emit("match_made","w",time);
  players[socketId].emit("match_made","b",time);
  players[opponentId].on("sync_state",function(fen,turn){
     players[socketId].emit("sync_state_from_server",fen,turn)
  });
  players[socketId].on("sync_state",function(fen,turn){
    players[opponentId].emit("sync_state_from_server",fen,turn)
  });
  players[opponentId].on("game_over",function(winner){
    players[socketId].emit("game_over_from_server",winner)
 });
 players[socketId].on("game_over",function(winner){
   players[opponentId].emit("game_over_from_server",winner)
 });

}

function HandlePlayRequest(socket,time){
   if(waiting[time].length>0){
    const opponentId = waiting[time].splice(0,1)[0];
    matches[time].push({
          [opponentId]: socket.id, 
    });
    initialSetupMatch(opponentId, socket.id,time);
    
    return ;
   }

    if(!waiting[time].includes(socket.id)){   
    waiting[time].push(socket.id);
    }
}

function fireOnConnected(socket){
    socket.on('want_to_play',function(timer){
        
        HandlePlayRequest(socket,timer);
        
    })
    totalPlayers++;
    fireTotalPlayers();
}
  
io.on("connection", (socket) => {
    players[socket.id] = socket;
    fireOnConnected(socket);
    socket.on('disconnect', ()=>fireOnDisconnect(socket))
  
});

httpServer.listen(PORT, ()=>{
    console.log("Server is running at "+ PORT);
}); 



