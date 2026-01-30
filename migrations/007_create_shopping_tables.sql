-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  shopping_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create shopping_items table
CREATE TABLE IF NOT EXISTS shopping_items (
  id SERIAL PRIMARY KEY,
  shopping_list_id INTEGER NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50),
  price DECIMAL(10, 2),
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  category VARCHAR(100),
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);
CREATE INDEX idx_shopping_lists_shopping_date ON shopping_lists(shopping_date);

CREATE INDEX idx_shopping_items_list_id ON shopping_items(shopping_list_id);
CREATE INDEX idx_shopping_items_is_purchased ON shopping_items(is_purchased);
CREATE INDEX idx_shopping_items_category ON shopping_items(category);

-- Create updated_at trigger for shopping_lists
CREATE TRIGGER update_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for shopping_items
CREATE TRIGGER update_shopping_items_updated_at
  BEFORE UPDATE ON shopping_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
