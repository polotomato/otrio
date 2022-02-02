require 'rails_helper'

RSpec.describe Message, type: :model do
  before do
    @message = FactoryBot.build(:message)
  end

  describe 'メッセージの保存' do
    context 'メッセージが投稿できる場合' do
      it 'テキストがユーザーに肝づいていればで投稿できる' do
        expect(@message).to be_valid
      end
    end
    context 'メッセージが投稿できない場合' do
      it 'テキストが空では投稿できない' do
        @message.content = ""
        @message.valid?
        expect(@message.errors.full_messages).to include "Content is too short (minimum is 1 character)"
      end
      it 'テキストが200文字を超えると投稿できない' do
        @message.content = "a" * 201
        @message.valid?
        expect(@message.errors.full_messages).to include "Content is too long (maximum is 200 characters)"
      end  
      it 'ユーザーが紐付いていなければ投稿できない' do
        @message.user = nil
        @message.valid?
        expect(@message.errors.full_messages).to include "User must exist"
      end
    end
  end
end
