class Message < ApplicationRecord
  validates :content, presence: true,
                      length: { minimum: 1, maximum: 200 }
  belongs_to :user
end
