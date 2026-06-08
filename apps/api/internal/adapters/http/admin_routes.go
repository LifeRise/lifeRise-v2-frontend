package http

import (
	"github.com/gin-gonic/gin"

	"github.com/liferise/backend/internal/adapters/http/handlers"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	"github.com/liferise/backend/pkg/auth"
)

// AdminHandlers holds all admin-scoped HTTP handlers.
type AdminHandlers struct {
	Dashboard     *handlers.AdminDashboardHandler
	User          *handlers.AdminUserHandler
	Company       *handlers.AdminCompanyHandler
	Role          *handlers.AdminRoleHandler
	Announcement  *handlers.AdminAnnouncementHandler
	Banner        *handlers.AdminBannerHandler
	FAQ           *handlers.AdminFAQHandler
	Event         *handlers.AdminEventHandler
	EventBooking  *handlers.AdminEventBookingHandler
	EventResponse *handlers.AdminEventResponseHandler
	Location      *handlers.AdminLocationHandler
	Service       *handlers.AdminServiceHandler
	Support       *handlers.AdminSupportHandler
	Waitlist      *handlers.AdminWaitlistHandler
	Booking       *handlers.AdminBookingHandler
	Customer      *handlers.AdminCustomerHandler
	Feedback      *handlers.AdminFeedbackHandler
}

// RegisterAdminRoutes mounts all /api/admin/* routes on the provided router group.
// The routes require JWT auth and at least one manager/admin role.
func RegisterAdminRoutes(api *gin.RouterGroup, jwtService *auth.Service, h *AdminHandlers) {
	admin := api.Group("")
	admin.Use(middleware.RequireAuth(jwtService))
	admin.Use(middleware.RequireRole(
		string(auth.RoleSuperAdmin),
		string(auth.RoleSales),
		string(auth.RolePMO),
		string(auth.RoleComplexManager),
	))
	{
		admin.GET("/admin/dashboard/overview", h.Dashboard.Overview)

		admin.GET("/admin/users", h.User.List)
		admin.GET("/admin/users/:id", h.User.Get)
		admin.POST("/admin/users", h.User.Create)
		admin.PATCH("/admin/users/:id", h.User.Update)
		admin.DELETE("/admin/users/:id", h.User.Delete)
		admin.POST("/admin/users/:id/reset-password", h.User.ResetPassword)
		admin.POST("/admin/users/:id/impersonate", h.User.Impersonate)

		admin.GET("/admin/companies", h.Company.List)
		admin.GET("/admin/companies/:id", h.Company.Get)
		admin.POST("/admin/companies", h.Company.Create)
		admin.PATCH("/admin/companies/:id", h.Company.Update)
		admin.DELETE("/admin/companies/:id", h.Company.Delete)
		admin.POST("/admin/companies/:id/verify", h.Company.Verify)

		admin.GET("/admin/roles", h.Role.List)
		admin.GET("/admin/roles/:id", h.Role.Get)
		admin.POST("/admin/roles", h.Role.Create)
		admin.PATCH("/admin/roles/:id", h.Role.Update)
		admin.DELETE("/admin/roles/:id", h.Role.Delete)
		admin.GET("/admin/roles/:id/permissions", h.Role.GetPermissions)
		admin.PUT("/admin/roles/:id/permissions", h.Role.UpdatePermissions)

		admin.GET("/admin/announcements", h.Announcement.List)
		admin.GET("/admin/announcements/:id", h.Announcement.Get)
		admin.POST("/admin/announcements", h.Announcement.Create)
		admin.PATCH("/admin/announcements/:id", h.Announcement.Update)
		admin.DELETE("/admin/announcements/:id", h.Announcement.Delete)

		admin.GET("/admin/app-banners", h.Banner.List)
		admin.GET("/admin/app-banners/:id", h.Banner.Get)
		admin.POST("/admin/app-banners", h.Banner.Create)
		admin.PATCH("/admin/app-banners/:id", h.Banner.Update)
		admin.DELETE("/admin/app-banners/:id", h.Banner.Delete)

		admin.GET("/admin/faqs", h.FAQ.List)
		admin.GET("/admin/faqs/:id", h.FAQ.Get)
		admin.POST("/admin/faqs", h.FAQ.Create)
		admin.PATCH("/admin/faqs/:id", h.FAQ.Update)
		admin.DELETE("/admin/faqs/:id", h.FAQ.Delete)

		admin.GET("/admin/group-events", h.Event.List)
		admin.GET("/admin/group-events/:id", h.Event.Get)
		admin.POST("/admin/group-events", h.Event.Create)
		admin.PATCH("/admin/group-events/:id", h.Event.Update)
		admin.DELETE("/admin/group-events/:id", h.Event.Delete)

		admin.GET("/admin/event-bookings", h.EventBooking.ListEventBookings)
		admin.GET("/admin/event-bookings/:id", h.EventBooking.GetEventBooking)
		admin.POST("/admin/event-bookings", h.EventBooking.CreateEventBooking)
		admin.PATCH("/admin/event-bookings/:id", h.EventBooking.UpdateEventBooking)
		admin.DELETE("/admin/event-bookings/:id", h.EventBooking.DeleteEventBooking)

		admin.GET("/admin/event-responses", h.EventResponse.ListEventResponses)
		admin.GET("/admin/event-responses/:id", h.EventResponse.GetEventResponse)
		admin.POST("/admin/event-responses", h.EventResponse.CreateEventResponse)
		admin.PATCH("/admin/event-responses/:id", h.EventResponse.UpdateEventResponse)
		admin.DELETE("/admin/event-responses/:id", h.EventResponse.DeleteEventResponse)

		admin.GET("/admin/locations", h.Location.List)
		admin.GET("/admin/locations/:id", h.Location.Get)
		admin.POST("/admin/locations", h.Location.Create)
		admin.PATCH("/admin/locations/:id", h.Location.Update)
		admin.DELETE("/admin/locations/:id", h.Location.Delete)

		admin.GET("/admin/services", h.Service.List)
		admin.GET("/admin/services/:id", h.Service.Get)
		admin.POST("/admin/services", h.Service.Create)
		admin.PATCH("/admin/services/:id", h.Service.Update)
		admin.DELETE("/admin/services/:id", h.Service.Delete)

		admin.GET("/admin/service-categories", h.Service.ListCategories)
		admin.GET("/admin/service-categories/:id", h.Service.GetCategory)
		admin.POST("/admin/service-categories", h.Service.CreateCategory)
		admin.PATCH("/admin/service-categories/:id", h.Service.UpdateCategory)
		admin.DELETE("/admin/service-categories/:id", h.Service.DeleteCategory)

		admin.GET("/admin/support", h.Support.List)
		admin.GET("/admin/support/:id", h.Support.Get)
		admin.POST("/admin/support", h.Support.Create)
		admin.PATCH("/admin/support/:id", h.Support.Update)
		admin.DELETE("/admin/support/:id", h.Support.Delete)
		admin.POST("/admin/support/:id/messages", h.Support.CreateMessage)

		admin.GET("/admin/waitlists", h.Waitlist.List)
		admin.GET("/admin/waitlists/:id", h.Waitlist.Get)
		admin.POST("/admin/waitlists", h.Waitlist.Create)
		admin.PATCH("/admin/waitlists/:id", h.Waitlist.Update)
		admin.DELETE("/admin/waitlists/:id", h.Waitlist.Delete)

		admin.GET("/admin/bookings", h.Booking.List)
		admin.GET("/admin/bookings/refunded", h.Booking.ListRefunded)
		admin.GET("/admin/bookings/:id", h.Booking.Get)
		admin.PATCH("/admin/bookings/:id", h.Booking.Update)
		admin.DELETE("/admin/bookings/:id", h.Booking.Delete)

		admin.GET("/admin/customers", h.Customer.List)
		admin.GET("/admin/customers/:id", h.Customer.Get)
		admin.POST("/admin/customers", h.Customer.Create)
		admin.PATCH("/admin/customers/:id", h.Customer.Update)
		admin.DELETE("/admin/customers/:id", h.Customer.Delete)

		admin.GET("/admin/feedbacks", h.Feedback.List)
		admin.GET("/admin/feedbacks/:id", h.Feedback.Get)
		admin.PATCH("/admin/feedbacks/:id", h.Feedback.Update)
		admin.DELETE("/admin/feedbacks/:id", h.Feedback.Delete)
	}
}
