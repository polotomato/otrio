class UsersController < ApplicationController
  def show
    @user = User.find_by(id: params[:id])

    if @user.nil?
      redirect_to rooms_path
    end

    # 4色のうちにどれかにヒットした棋譜を呼び出す
    @records = BattleRecord.includes(:winner).includes(:red).includes(:green).includes(:purple).includes(:blue).where(
      "red_id = ? OR green_id = ? OR purple_id = ? OR blue_id = ?", @user.id, @user.id, @user.id, @user.id
    )
    @count_wins = BattleRecord.where(winner: @user.id).size
  end
end
