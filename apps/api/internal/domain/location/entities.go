package location

import (
	"time"
)

// LocationType discriminates location records.
type LocationType string

const (
	LocationTypeRegion       LocationType = "region"
	LocationTypeCity         LocationType = "city"
	LocationTypeNeighborhood LocationType = "neighborhood"
)

// Valid returns true for known location types.
func (t LocationType) Valid() bool {
	switch t {
	case LocationTypeRegion, LocationTypeCity, LocationTypeNeighborhood:
		return true
	}
	return false
}

// Location represents a geographic node in the property hierarchy.
type Location struct {
	ID        uint64       `gorm:"column:id;primaryKey"`
	Name      string       `gorm:"column:name;size:255;not null"`
	Type      LocationType `gorm:"column:type;size:20;not null;index"`
	ParentID  *uint64      `gorm:"column:parent_id;index"`
	Lat       *float64     `gorm:"column:lat;type:numeric(10,7)"`
	Lng       *float64     `gorm:"column:lng;type:numeric(10,7)"`
	CreatedAt time.Time    `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time    `gorm:"column:updated_at;autoUpdateTime"`
}

func (Location) TableName() string { return "locations" }
