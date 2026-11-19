package main

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// ==========================================
// 1. Blockchain Data Structures & Algorithms
// ==========================================

type Block struct {
	Index             int                 `json:"index"`
	Timestamp         int64               `json:"timestamp"`
	Transactions      []map[string]interface{} `json:"transactions"`
	PreviousHash      string              `json:"previous_hash"`
	Difficulty        int                 `json:"difficulty"`
	Nonce             int                 `json:"nonce"`
	Hash              string              `json:"hash"`
	MiningTimeSeconds float64             `json:"mining_time_seconds"`
}

type Attendee struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	PublicKeyPEM string `json:"public_key_pem"`
}

type Blockchain struct {
	Chain             []Block                  `json:"chain"`
	PendingTransactions []map[string]interface{} `json:"pending_transactions"`
	RegisteredUsers   map[string]Attendee      `json:"registered_users"`
	TargetBlockTime   float64                  `json:"target_block_time"`
	AdjustmentInterval int                     `json:"adjustment_interval"`
}

var bc Blockchain

func InitBlockchain() {
	bc = Blockchain{
		Chain:             []Block{},
		PendingTransactions: []map[string]interface{}{},
		RegisteredUsers:   make(map[string]Attendee),
		TargetBlockTime:   2.0, // Expected 2 seconds per block
		AdjustmentInterval: 3,  // Adjust difficulty every 3 blocks
	}

	// Genesis Block
	genesisBlock := Block{
		Index:        0,
		Timestamp:    time.Now().Unix(),
		Transactions: []map[string]interface{}{{"type": "GENESIS", "message": "Conference Genesis Block"}},
		PreviousHash: "0",
		Difficulty:   2,
		Nonce:        0,
	}
	genesisBlock.Hash = genesisBlock.CalculateHash()
	bc.Chain = append(bc.Chain, genesisBlock)
}

func (b *Block) CalculateHash() string {
	txBytes, _ := json.Marshal(b.Transactions)
	record := fmt.Sprintf("%d-%d-%s-%s-%d-%d", b.Index, b.Timestamp, string(txBytes), b.PreviousHash, b.Difficulty, b.Nonce)
	hash := sha256.Sum256([]byte(record))
	return hex.EncodeToString(hash[:])
}

func (b *Block) Mine(difficulty int) {
	b.Difficulty = difficulty
	target := strings.Repeat("0", difficulty)
	startTime := time.Now()

	for {
		b.Hash = b.CalculateHash()
		if strings.HasPrefix(b.Hash, target) {
			b.MiningTimeSeconds = time.Since(startTime).Seconds()
			break
		}
		b.Nonce++
	}
}

// Dynamic difficulty adjustment (Bitcoin-style)
func (bc *Blockchain) AdjustDifficulty() int {
	latestBlock := bc.Chain[len(bc.Chain)-1]
	if len(bc.Chain)%bc.AdjustmentInterval != 0 {
		return latestBlock.Difficulty
	}

	startBlock := bc.Chain[len(bc.Chain)-bc.AdjustmentInterval]
	actualTime := float64(latestBlock.Timestamp - startBlock.Timestamp)
	expectedTime := bc.TargetBlockTime * float64(bc.AdjustmentInterval)

	currentDiff := latestBlock.Difficulty
	if actualTime < expectedTime*0.5 {
		fmt.Printf("[Dynamic Difficulty] 實際時間 (%.2fs) < 預期 (%.2fs)，提升難度至 %d\n", actualTime, expectedTime, currentDiff+1)
		return currentDiff + 1
	} else if actualTime > expectedTime*1.5 && currentDiff > 1 {
		fmt.Printf("[Dynamic Difficulty] 實際時間 (%.2fs) > 預期 (%.2fs)，降低難度至 %d\n", actualTime, expectedTime, currentDiff-1)
		return currentDiff - 1
	}
	return currentDiff
}

// RSA digital signature verification
func VerifyRSASignature(pubKeyPEM string, message map[string]interface{}, sigHex string) bool {
	block, _ := pem.Decode([]byte(pubKeyPEM))
	if block == nil {
		return false
	}
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return false
	}
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return false
	}

	msgBytes, _ := json.Marshal(message)
	hashed := sha256.Sum256(msgBytes)

	sigBytes, err := hex.DecodeString(sigHex)
	if err != nil {
		return false
	}

	err = rsa.VerifyPKCS1v15(rsaPub, crypto.SHA256, hashed[:], sigBytes)
	return err == nil
}

// ==========================================
// 2. REST API Routes & Controllers
// ==========================================

func main() {
	InitBlockchain()
	r := gin.Default()
	r.Use(cors.Default())

	// 1. Generate RSA key pair (convenient for testing)
	r.GET("/api/generate-keys", func(c *gin.Context) {
		privateKey, err := rsa.GenerateKey(rand.Reader, 1024)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate keys"})
			return
		}

		pubASN1, _ := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
		pubPEM := pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pubASN1})

		privBytes := x509.MarshalPKCS1PrivateKey(privateKey)
		privPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: privBytes})

		c.JSON(http.StatusOK, gin.H{
			"public_key_pem":  string(pubPEM),
			"private_key_pem": string(privPEM),
		})
	})

	// 2. Attendee registration
	r.POST("/api/register", func(c *gin.Context) {
		var attendee Attendee
		if err := c.BindJSON(&attendee); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if _, exists := bc.RegisteredUsers[attendee.ID]; exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Attendee ID already registered"})
			return
		}

		bc.RegisteredUsers[attendee.ID] = attendee
		regTx := map[string]interface{}{
			"type":           "REGISTRATION",
			"attendee_id":    attendee.ID,
			"name":           attendee.Name,
			"email":          attendee.Email,
			"public_key_pem": attendee.PublicKeyPEM,
		}
		bc.PendingTransactions = append(bc.PendingTransactions, regTx)
		c.JSON(http.StatusOK, gin.H{"message": "Registration successful and added to pending pool"})
	})

	// 3. Submit attendance to pending pool (with signature verification)
	r.POST("/api/attendance", func(c *gin.Context) {
		var req struct {
			Certificate map[string]interface{} `json:"certificate"`
			Signature   string                 `json:"signature"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		attendeeID, ok := req.Certificate["attendee_id"].(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid certificate attendee_id"})
			return
		}

		user, exists := bc.RegisteredUsers[attendeeID]
		if !exists {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Attendee not registered in system"})
			return
		}

		// Verify digital signature
		if !VerifyRSASignature(user.PublicKeyPEM, req.Certificate, req.Signature) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid digital signature! Attendance rejected."})
			return
		}

		tx := map[string]interface{}{
			"type":        "ATTENDANCE",
			"certificate": req.Certificate,
			"signature":   req.Signature,
		}
		bc.PendingTransactions = append(bc.PendingTransactions, tx)
		c.JSON(http.StatusOK, gin.H{"message": "Valid signature! Attendance recorded to pending pool."})
	})

	// 4. Miner mines and packages a block
	r.POST("/api/mine", func(c *gin.Context) {
		if len(bc.PendingTransactions) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No pending transactions to mine"})
			return
		}

		newDifficulty := bc.AdjustDifficulty()
		latestBlock := bc.Chain[len(bc.Chain)-1]

		newBlock := Block{
			Index:        latestBlock.Index + 1,
			Timestamp:    time.Now().Unix(),
			Transactions: bc.PendingTransactions,
			PreviousHash: latestBlock.Hash,
		}

		newBlock.Mine(newDifficulty)
		bc.Chain = append(bc.Chain, newBlock)
		bc.PendingTransactions = []map[string]interface{}{} // Clear pending pool

		c.JSON(http.StatusOK, gin.H{"message": "Block mined successfully", "block": newBlock})
	})

	// 5. Query blockchain data
	r.GET("/api/chain", func(c *gin.Context) {
		c.JSON(http.StatusOK, bc)
	})

	// 6. Query 1: Get all sessions attended by a specific participant
	r.GET("/api/query/sessions", func(c *gin.Context) {
		attendeeID := c.Query("attendee_id")
		var sessions []string
		for _, block := range bc.Chain {
			for _, tx := range block.Transactions {
				if tx["type"] == "ATTENDANCE" {
					cert := tx["certificate"].(map[string]interface{})
					if cert["attendee_id"] == attendeeID {
						sessions = append(sessions, cert["session_id"].(string))
					}
				}
			}
		}
		c.JSON(http.StatusOK, gin.H{"attendee_id": attendeeID, "sessions": sessions})
	})

	// 7. Query 2: Get all participants who attended a specific session
	r.GET("/api/query/participants", func(c *gin.Context) {
		sessionID := c.Query("session_id")
		var participants []string
		for _, block := range bc.Chain {
			for _, tx := range block.Transactions {
				if tx["type"] == "ATTENDANCE" {
					cert := tx["certificate"].(map[string]interface{})
					if cert["session_id"] == sessionID {
						participants = append(participants, cert["attendee_id"].(string))
					}
				}
			}
		}
		c.JSON(http.StatusOK, gin.H{"session_id": sessionID, "participants": participants})
	})

	fmt.Println("Go Blockchain Server running on http://localhost:8080")
	r.Run(":8080")
}