/**
 * ============================================================================
 * R1-7A Hardware Bridge — C++ 橋接器
 * ============================================================================
 *
 * 職責（ROS2 hardware_interface + micro-ROS agent 概念）：
 *   1. 直接連結 r1-7a_sdk 靜態庫（ArmMotorBus / IM6014 串列匯流排）
 *   2. 內部 500Hz 讀取馬達遙測（URDF frame：q / dq / tau）
 *   3. 對上以 UDP JSON-RPC（埠 15000）提供控制介面俾 Node.js Control Service
 *   4. 以 100Hz 主動推送遙測到已註冊嘅客戶端
 *
 * 協議（UDP datagram, UTF-8 JSON）：
 *   請求:  {"id":1,"method":"goto","params":{"joints":[..7..],"duration":2.0}}
 *   回應:  {"id":1,"ok":true,"data":{...}}
 *   推送:  {"push":"telemetry","data":{"q":[..],"dq":[..],"tau":[..],"temp":[..],
 *           "errorCode":0}}
 *
 * 支援方法：
 *   ping | foc | home | goto | stop | zeroTorque | clear | reset
 *
 * 編譯（Ubuntu 20.04+, gcc 9.4+）：
 *   cd hardware-bridge && mkdir build && cd build
 *   cmake .. && make -j$(nproc)
 *
 * 執行（真機，串口 ttyUSB0）：
 *   ./r1a_bridge /dev/ttyUSB0 6000000 15000
 *
 * ⚠️ SDK 對接說明：
 *   下面 `r1a_sdk_*` 標註嘅區段需要按 r1-7a_sdk 實際標頭檔（arm_motor_bus.h 等）
 *   嘅函數簽名微調。協議層（UDP/JSON/遙測推送）已完整實現，唔使改。
 * ============================================================================
 */

#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <string>
#include <vector>
#include <array>
#include <atomic>
#include <thread>
#include <mutex>
#include <chrono>
#include <cmath>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

// ----------------------------------------------------------------------------
// r1a_sdk_* — SDK 對接層
// 【根據 r1-7a_sdk 實際 API 調整以下 include 同函數呼叫】
// ----------------------------------------------------------------------------
// #include "arm_motor_bus.hpp"   // r1-7a_sdk：ArmMotorBus（URDF↔motor 轉換）

static constexpr int kDof = 7;

class ArmBridge {
public:
  ArmBridge(const std::string& port, int baudrate)
      : port_(port), baudrate_(baudrate) {}

  /** 連接 IM6014 串列匯流排 */
  bool connect() {
    // TODO(r1a_sdk): 實際 SDK 初始化，例如：
    //   bus_ = std::make_unique<ArmMotorBus>(port_, baudrate_);
    //   bus_->Init();
    printf("[bridge] 已連接 %s @ %d (IM6014)\n", port_.c_str(), baudrate_);
    connected_ = true;
    return true;
  }

  bool isConnected() const { return connected_; }

  /** 讀取遙測（500Hz 內部循環調用）— URDF frame */
  void readTelemetry() {
    std::lock_guard<std::mutex> lk(mtx_);
    // TODO(r1a_sdk): 實際讀取，例如：
    //   bus_->RefreshRx(); / bus_->GetState(q, dq, tau, temp);
    // 以下為佔位（連唔到真機時維持零位）
    for (int i = 0; i < kDof; ++i) {
      // q_[i] = bus_->q[i]; dq_[i] = bus_->dq[i]; tau_[i] = bus_->tau[i];
      // temp_[i] = bus_->temp[i];
    }
  }

  /** 指令入口（由 JSON-RPC 線程調用） */
  bool command(const std::string& method,
               const std::vector<double>& joints, double duration) {
    std::lock_guard<std::mutex> lk(mtx_);
    if (!connected_) return false;
    if (method == "foc") {
      // TODO(r1a_sdk): bus_->Foc();
    } else if (method == "home") {
      // TODO(r1a_sdk): bus_->Home();
    } else if (method == "goto") {
      if (joints.size() != kDof) return false;
      // TODO(r1a_sdk): bus_->Goto(joints.data(), duration);
      //   （SDK demo_arm_motion 使用 cosine-profile；duration 單位秒）
    } else if (method == "stop") {
      // TODO(r1a_sdk): bus_->Stop();
    } else if (method == "zeroTorque") {
      // TODO(r1a_sdk): bus_->ZeroTorque();
    } else if (method == "clear") {
      // TODO(r1a_sdk): bus_->ClearError();
    } else if (method == "reset") {
      // TODO(r1a_sdk): bus_->Reset();
    } else if (method == "ping") {
      return true;
    } else {
      return false;
    }
    return true;
  }

  std::string telemetryJson() {
    std::lock_guard<std::mutex> lk(mtx_);
    char buf[1024];
    std::string s = "{\"push\":\"telemetry\",\"data\":{";
    s += "\"q\":[";    appendArr(s, q_);
    s += "],\"dq\":["; appendArr(s, dq_);
    s += "],\"tau\":["; appendArr(s, tau_);
    s += "],\"temp\":["; appendArr(s, temp_);
    snprintf(buf, sizeof(buf), "],\"errorCode\":%d,\"errorMessage\":null}}", error_code_);
    s += buf;
    return s;
  }

private:
  static void appendArr(std::string& s, const std::array<double, kDof>& a) {
    char buf[64];
    for (int i = 0; i < kDof; ++i) {
      snprintf(buf, sizeof(buf), i ? ",%.6f" : "%.6f", a[i]);
      s += buf;
    }
  }

  std::string port_;
  int baudrate_;
  std::atomic<bool> connected_{false};
  std::mutex mtx_;
  std::array<double, kDof> q_{}, dq_{}, tau_{}, temp_{};
  int error_code_ = 0;
};

// ----------------------------------------------------------------------------
// 極簡 JSON 參數提取（避免引入依賴；只處理本協議嘅固定結構）
// ----------------------------------------------------------------------------
static bool extractJoints(const std::string& json, std::vector<double>& out) {
  auto pos = json.find("\"joints\"");
  if (pos == std::string::npos) return false;
  auto ls = json.find('[', pos);
  auto le = json.find(']', pos);
  if (ls == std::string::npos || le == std::string::npos) return false;
  std::string arr = json.substr(ls + 1, le - ls - 1);
  char* ctx = nullptr;
  for (char* tok = strtok_r(arr.data(), ",", &ctx); tok;
       tok = strtok_r(nullptr, ",", &ctx)) {
    out.push_back(std::atof(tok));
  }
  return out.size() == kDof;
}

static double extractDuration(const std::string& json, double def) {
  auto pos = json.find("\"duration\"");
  if (pos == std::string::npos) return def;
  auto c = json.find(':', pos);
  return c == std::string::npos ? def : std::atof(json.c_str() + c + 1);
}

static std::string extractMethod(const std::string& json) {
  auto pos = json.find("\"method\"");
  if (pos == std::string::npos) return "";
  auto qs = json.find('"', json.find(':', pos) + 1);
  auto qe = json.find('"', qs + 1);
  return qs == std::string::npos || qe == std::string::npos
             ? "" : json.substr(qs + 1, qe - qs - 1);
}

static long extractId(const std::string& json) {
  auto pos = json.find("\"id\"");
  if (pos == std::string::npos) return 0;
  auto c = json.find(':', pos);
  return c == std::string::npos ? 0 : std::atol(json.c_str() + c + 1);
}

// ----------------------------------------------------------------------------
// UDP JSON-RPC 服務器
// ----------------------------------------------------------------------------
int main(int argc, char** argv) {
  const char* port_dev = argc > 1 ? argv[1] : "/dev/ttyUSB0";
  int baudrate = argc > 2 ? std::atoi(argv[2]) : 6000000;
  int listen_port = argc > 3 ? std::atoi(argv[3]) : 15000;

  ArmBridge bridge(port_dev, baudrate);
  if (!bridge.connect()) {
    fprintf(stderr, "[bridge] 無法連接 %s — 確認 dialout 權限同裝置存在\n", port_dev);
    return 1;
  }

  int sock = socket(AF_INET, SOCK_DGRAM, 0);
  if (sock < 0) { perror("socket"); return 1; }

  sockaddr_in addr{};
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = htonl(INADDR_ANY);
  addr.sin_port = htons(listen_port);
  if (bind(sock, (sockaddr*)&addr, sizeof(addr)) < 0) { perror("bind"); return 1; }

  printf("[bridge] R1-7A Hardware Bridge 已啟動 — UDP :%d\n", listen_port);
  printf("[bridge] 等待 Control Service 註冊…（首個 ping 註冊遙測推送）\n");

  // 已註冊客戶端（通常一個：Node.js Control Service）
  sockaddr_in client{};
  bool client_registered = false;

  // ---- 遙測推送線程（100Hz）----
  std::thread push_thread([&]() {
    constexpr auto period = std::chrono::microseconds(10000); // 100Hz
    auto next = std::chrono::steady_clock::now() + period;
    while (true) {
      std::this_thread::sleep_until(next);
      next += period;
      bridge.readTelemetry();
      if (client_registered) {
        std::string msg = bridge.telemetryJson();
        sendto(sock, msg.c_str(), msg.size(), 0,
               (sockaddr*)&client, sizeof(client));
      }
    }
  });

  // ---- RPC 處理循環 ----
  char buf[2048];
  while (true) {
    sockaddr_in from{};
    socklen_t flen = sizeof(from);
    ssize_t n = recvfrom(sock, buf, sizeof(buf) - 1, 0, (sockaddr*)&from, &flen);
    if (n <= 0) continue;
    buf[n] = '\0';
    std::string req(buf);

    std::string method = extractMethod(req);
    long id = extractId(req);
    std::vector<double> joints;
    bool has_joints = extractJoints(req, joints);
    double duration = extractDuration(req, 2.0);

    bool ok = bridge.isConnected() && bridge.command(method, joints, duration);
    if (method == "ping") {
      client = from;              // 註冊遙測推送客戶端
      client_registered = true;
      printf("[bridge] 客戶端已註冊 (%s:%d)\n",
             inet_ntoa(from.sin_addr), ntohs(from.sin_port));
      ok = true;
    }

    char resp[256];
    snprintf(resp, sizeof(resp),
             "{\"id\":%ld,\"ok\":%s,\"data\":{}}",
             id, ok ? "true" : "false");
    sendto(sock, resp, strlen(resp), 0, (sockaddr*)&from, flen);
  }

  push_thread.join();
  close(sock);
  return 0;
}
