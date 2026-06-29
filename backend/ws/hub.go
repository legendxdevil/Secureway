package ws

import (
	"log"
	"net/http"
	"sync"

	"github.com/fasthttp/websocket"
)

var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for prototype
	},
}

type Client struct {
	Hub   *Hub
	Conn  *websocket.Conn
	OrgID string
	Send  chan []byte
}

type Hub struct {
	Clients    map[string]map[*Client]bool // orgId -> clients
	Broadcast  chan BroadcastMessage
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

type BroadcastMessage struct {
	OrgID   string
	Message []byte
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[string]map[*Client]bool),
		Broadcast:  make(chan BroadcastMessage),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.Clients[client.OrgID] == nil {
				h.Clients[client.OrgID] = make(map[*Client]bool)
			}
			h.Clients[client.OrgID][client] = true
			h.mu.Unlock()
			log.Printf("Client registered for Org: %s", client.OrgID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.Clients[client.OrgID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.Clients, client.OrgID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered for Org: %s", client.OrgID)

		case msg := <-h.Broadcast:
			h.mu.Lock()
			clients := h.Clients[msg.OrgID]
			for client := range clients {
				select {
				case client.Send <- msg.Message:
				default:
					close(client.Send)
					delete(clients, client)
				}
			}
			if len(clients) == 0 {
				delete(h.Clients, msg.OrgID)
			}
			h.mu.Unlock()
		}
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()
	for message := range c.Send {
		err := c.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			break
		}
	}
}

// Global Hub reference
var GlobalHub *Hub
