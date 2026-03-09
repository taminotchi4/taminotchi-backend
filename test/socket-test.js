const { io } = require("socket.io-client");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc0Mzc3OTYwLTMwYmEtNDAxNS05N2Q0LTMwMWRjZTI5M2JhNiIsInJvbGUiOiJtYXJrZXQiLCJpc0FjdGl2ZSI6dHJ1ZSwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTc3Mjg4MzAxMiwiZXhwIjoxNzc0MTc5MDEyfQ.r7zQNSVgKVGzFEjEOiCNIM5_VkGEUT0-e9hT3mmTQoc";

const socket = io("http://localhost:3003/group-chat", {
    auth: {
        token: token
    },
    transports: ["websocket"]
});

socket.on("connect", () => {
    console.log("✅ Connected:", socket.id);

    socket.emit("join_group", {
        groupId: "1246af62-da46-413e-b081-9f528b057a25"
    });

    socket.emit(
        "load_history",
        {
            groupId: "1246af62-da46-413e-b081-9f528b057a25",
            page: 1,
            limit: 10
        }
    );
});

socket.on("history", (msg) => {
    console.log("✅ History:", msg);
});

socket.on("disconnect", () => {
    console.log("❌ Disconnected");
});

socket.on("connect_error", (err) => {
    console.log("⚠️ Connection error:", err.message);
});