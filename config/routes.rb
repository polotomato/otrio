Rails.application.routes.draw do
  devise_for :users, path: ''
  root 'rooms#index'
end
