Rails.application.routes.draw do
  root 'rooms#top'
  devise_for :users, path: ''
  resources :rooms, only: [:index, :show]
end
