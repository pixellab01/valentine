// 2. Prepare Video HTML (Final Page)
let videoContent = `
           <video width="350" height="500" controls autoplay loop muted style="border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
              <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
              Your browser does not support the video tag.
           </video>
         `;


// 3. Render Full Template
app.innerHTML = `
          <div class="container mt-5">
            <div class="row">
              <div class="col-md-8 offset-md-2">
                <div class="card">
                  <div class="card-body">
                    <h5 class="card-title text-center">Welcome to Our Service</h5>
                    <p class="card-text text-center">We are glad to have you on board. Get ready to explore our amazing features.</p>
                    <div class="text-center">
                      ${videoContent}
                    </div>
                    <div class="text-center mt-4">
                      <a href="#" class="btn btn-primary btn-lg">Get Started</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
