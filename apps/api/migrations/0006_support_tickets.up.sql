-- Support tickets and messages
CREATE TABLE IF NOT EXISTS support_tickets (
  id BIGSERIAL PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  category VARCHAR(50) NULL,
  requester_user_id BIGINT NULL,
  requester_email VARCHAR(255) NULL,
  assignee_user_id BIGINT NULL,
  company_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee ON support_tickets(assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_email ON support_tickets(requester_email);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_user_id BIGINT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
