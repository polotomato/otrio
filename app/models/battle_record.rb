class BattleRecord < ApplicationRecord
  belongs_to :winner, class_name: 'User', foreign_key: :winner_id
end
