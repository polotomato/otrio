class BattleRecord < ApplicationRecord
  belongs_to :winner, class_name: 'User', foreign_key: :winner_id
  belongs_to :red,    class_name: 'User', foreign_key: :red_id
  belongs_to :green,  class_name: 'User', foreign_key: :green_id
  belongs_to :purple, class_name: 'User', foreign_key: :purple_id
  belongs_to :blue,   class_name: 'User', foreign_key: :blue_id
end
