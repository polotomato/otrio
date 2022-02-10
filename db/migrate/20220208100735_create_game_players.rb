class CreateGamePlayers < ActiveRecord::Migration[6.0]
  def change
    create_table :game_players do |t|
      t.references :room, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer    :seat, null: false
      t.timestamps
    end
  end
end
