package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/support"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminSupportHandler handles admin support ticket operations.
type AdminSupportHandler struct {
	db          *gorm.DB
	supportRepo *persistence.SupportRepo
	auditLogger *appaudit.Logger
}

// NewAdminSupportHandler creates a new AdminSupportHandler.
func NewAdminSupportHandler(db *gorm.DB, supportRepo *persistence.SupportRepo, auditLogger *appaudit.Logger) *AdminSupportHandler {
	return &AdminSupportHandler{db: db, supportRepo: supportRepo, auditLogger: auditLogger}
}

// CreateSupportTicketRequest defines the body for creating a support ticket.
type CreateSupportTicketRequest struct {
	Subject         string  `json:"subject" validate:"required"`
	Body            string  `json:"body" validate:"required"`
	Status          string  `json:"status" validate:"oneof=open in_progress resolved closed"`
	Priority        string  `json:"priority" validate:"oneof=low normal high urgent"`
	Category        *string `json:"category"`
	RequesterUserID *uint64 `json:"requester_user_id"`
	RequesterEmail  *string `json:"requester_email"`
	AssigneeUserID  *uint64 `json:"assignee_user_id"`
	CompanyID       *uint64 `json:"company_id"`
}

// UpdateSupportTicketRequest defines the body for updating a support ticket.
type UpdateSupportTicketRequest struct {
	Subject         *string `json:"subject"`
	Body            *string `json:"body"`
	Status          *string `json:"status" validate:"omitempty,oneof=open in_progress resolved closed"`
	Priority        *string `json:"priority" validate:"omitempty,oneof=low normal high urgent"`
	Category        *string `json:"category"`
	RequesterUserID *uint64 `json:"requester_user_id"`
	RequesterEmail  *string `json:"requester_email"`
	AssigneeUserID  *uint64 `json:"assignee_user_id"`
	CompanyID       *uint64 `json:"company_id"`
}

// CreateTicketMessageRequest defines the body for creating a ticket message.
type CreateTicketMessageRequest struct {
	Body         string  `json:"body" validate:"required"`
	AuthorUserID *uint64 `json:"author_user_id"`
}

// List returns paginated support tickets.
func (h *AdminSupportHandler) List(c *gin.Context) {
	p := pagination.Parse(c)

	filters := support.ListFilters{
		Status:   c.Query("status"),
		Priority: c.Query("priority"),
		Search:   c.Query("search"),
		Page:     p.Page,
		PerPage:  p.PerPage,
	}

	if assigneeIDStr := c.Query("assignee_id"); assigneeIDStr != "" {
		id, err := strconv.ParseUint(assigneeIDStr, 10, 64)
		if err != nil {
			response.ValidationErrorSingle(c, "assignee_id", "The assignee_id must be a valid integer.")
			return
		}
		filters.AssigneeID = &id
	}
	if companyIDStr := c.Query("company_id"); companyIDStr != "" {
		id, err := strconv.ParseUint(companyIDStr, 10, 64)
		if err != nil {
			response.ValidationErrorSingle(c, "company_id", "The company_id must be a valid integer.")
			return
		}
		filters.CompanyID = &id
	}

	tickets, total, err := h.supportRepo.List(c.Request.Context(), h.db, filters)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load support tickets.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(tickets))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Support tickets retrieved.", tickets, meta, links)
}

// Get returns a single support ticket.
func (h *AdminSupportHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	ticket, err := h.supportRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Support ticket not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Support ticket retrieved.", ticket)
}

// Create creates a new support ticket.
func (h *AdminSupportHandler) Create(c *gin.Context) {
	var req CreateSupportTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	ticket := support.Ticket{
		Subject:         req.Subject,
		Body:            req.Body,
		Status:          req.Status,
		Priority:        req.Priority,
		Category:        req.Category,
		RequesterUserID: req.RequesterUserID,
		RequesterEmail:  req.RequesterEmail,
		AssigneeUserID:  req.AssigneeUserID,
		CompanyID:       req.CompanyID,
	}
	if ticket.Status == "" {
		ticket.Status = "open"
	}
	if ticket.Priority == "" {
		ticket.Priority = "normal"
	}

	if err := h.supportRepo.Create(c.Request.Context(), h.db, &ticket); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create support ticket.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "support_tickets", ticket.ID, nil, ticket)

	response.Success(c, http.StatusCreated, "Support ticket created.", ticket)
}

// Update updates a support ticket.
func (h *AdminSupportHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateSupportTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	ticket, err := h.supportRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Support ticket not found.", nil)
		return
	}

	old := *ticket
	if req.Subject != nil {
		ticket.Subject = *req.Subject
	}
	if req.Body != nil {
		ticket.Body = *req.Body
	}
	if req.Status != nil {
		ticket.Status = *req.Status
	}
	if req.Priority != nil {
		ticket.Priority = *req.Priority
	}
	if req.Category != nil {
		ticket.Category = req.Category
	}
	if req.RequesterUserID != nil {
		ticket.RequesterUserID = req.RequesterUserID
	}
	if req.RequesterEmail != nil {
		ticket.RequesterEmail = req.RequesterEmail
	}
	if req.AssigneeUserID != nil {
		ticket.AssigneeUserID = req.AssigneeUserID
	}
	if req.CompanyID != nil {
		ticket.CompanyID = req.CompanyID
	}

	if err := h.supportRepo.Update(c.Request.Context(), h.db, ticket); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update support ticket.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "support_tickets", id, old, ticket)

	response.Success(c, http.StatusOK, "Support ticket updated.", ticket)
}

// Delete soft-deletes a support ticket.
func (h *AdminSupportHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.supportRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete support ticket.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "support_tickets", id, nil, nil)

	c.Status(http.StatusNoContent)
}

// CreateMessage adds a message to a support ticket.
func (h *AdminSupportHandler) CreateMessage(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req CreateTicketMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if _, err := h.supportRepo.GetByID(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusNotFound, "Support ticket not found.", nil)
		return
	}

	msg := support.Message{
		TicketID:     id,
		Body:         req.Body,
		AuthorUserID: req.AuthorUserID,
	}

	if err := h.supportRepo.CreateMessage(c.Request.Context(), h.db, &msg); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create message.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "support_messages", msg.ID, nil, msg)

	response.Success(c, http.StatusCreated, "Message created.", msg)
}
