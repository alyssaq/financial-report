import flask
app = flask.Flask(__name__, template_folder='.', static_folder='public', static_url_path='')

# css_blueprint = flask.Blueprint('css', __name__, static_url_path='/css', static_folder='css')
# js_blueprint = flask.Blueprint('js', __name__, static_url_path='/js', static_folder='js')
# data_blueprint = flask.Blueprint('data', __name__, static_url_path='/data', static_folder='data')
# app.register_blueprint(css_blueprint)
# app.register_blueprint(js_blueprint)
# app.register_blueprint(data_blueprint)

@app.route('/')
def index(name=None):
  return flask.render_template('index.html', name=name)

if __name__ == '__main__':
  app.run(host='0.0.0.0', debug=True)
