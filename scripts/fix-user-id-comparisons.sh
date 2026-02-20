#!/bin/bash

# Script to fix user_id comparisons across all controllers and services
# Converts: user_id !== userId
# To: user_id.toString() !== userId.toString()

echo "🔧 Fixing user_id comparisons in controllers and services..."

# Find all TypeScript files in controllers and services
files=$(find src/controllers src/services -name "*.ts" -type f)

count=0
for file in $files; do
  # Check if file contains the problematic pattern
  if grep -q "\.user_id !== userId" "$file" || grep -q "\.user_id === userId" "$file"; then
    echo "  Fixing: $file"
    
    # Fix !== comparisons
    sed -i '' 's/\.user_id !== userId/.user_id.toString() !== userId.toString()/g' "$file"
    
    # Fix === comparisons
    sed -i '' 's/\.user_id === userId/.user_id.toString() === userId.toString()/g' "$file"
    
    count=$((count + 1))
  fi
done

echo "✅ Fixed $count file(s)"
echo ""
echo "Summary:"
echo "  Changed: .user_id !== userId"
echo "  To: .user_id.toString() !== userId.toString()"
