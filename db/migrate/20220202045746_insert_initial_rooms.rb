class InsertInitialRooms < ActiveRecord::Migration[6.0]
  def change
    # 対戦部屋を9個用意する
    9.times do
      Room.create()
    end
  end
end
