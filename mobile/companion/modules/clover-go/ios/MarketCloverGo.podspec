Pod::Spec.new do |s|
  s.name = 'MarketCloverGo'
  s.version = '0.1.0'
  s.summary = 'Fail-closed Clover Go native availability boundary'
  s.description = s.summary
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Farmers Market Platform'
  s.homepage = 'https://localhost'
  s.platforms = { :ios => '16.0' }
  s.source = { :path => '.' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,mm,swift}'
end
