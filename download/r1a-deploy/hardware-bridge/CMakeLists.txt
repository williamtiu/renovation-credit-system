cmake_minimum_required(VERSION 3.10)
project(r1a_bridge CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_BUILD_TYPE Release)

# ---- r1-7a_sdk 對接 ----
# 1. 將 r1-7a_sdk clone 到本目錄旁邊（或改做你嘅路徑）：
#      git clone https://github.com/unitreerobotics/r1-7a_sdk.git
# 2. 按需要取消註釋以下 include 目錄同庫連結：
#
# set(R1A_SDK_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../r1-7a_sdk" CACHE PATH "r1-7a_sdk 路徑")
# include_directories(${R1A_SDK_DIR}/include)
# link_directories(${R1A_SDK_DIR}/lib)

add_executable(r1a_bridge src/main.cpp)
target_link_libraries(r1a_bridge pthread)
# target_link_libraries(r1a_bridge pthread r1_7a_sdk)   # ← SDK 靜態庫

# ---- 安裝 ----
install(TARGETS r1a_bridge DESTINATION bin)
