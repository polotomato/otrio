class CreateBattleRecords < ActiveRecord::Migration[6.0]
  def change
    create_table :battle_records do |t|
      t.references    :winner,   foreign_key: { to_table: :users }
      t.references    :red,      foreign_key: { to_table: :users }
      t.references    :green,    foreign_key: { to_table: :users }
      t.references    :purple,   foreign_key: { to_table: :users }
      t.references    :blue,     foreign_key: { to_table: :users }
      t.text          :kifu
      t.timestamps
    end
  end
end
