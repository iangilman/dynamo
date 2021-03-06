/*globals dynamo, Kinetic, amplify */

(function() {

  window.dynamo = {
    init: function() {
      var self = this;
      
      this.Stock.init(); 
      this.Flow.init();
      
      this.running = false;
      
      var ww = $(window).width();
      var wh = $(window).height();
      this.stage = new Kinetic.Stage({
        container: "viewport",
        width: ww,
        height: wh
      });

      this.flowLayer = new Kinetic.Layer();
      this.stage.add(this.flowLayer);
      
      this.stockLayer = new Kinetic.Layer();
      this.stage.add(this.stockLayer);
      
      this.stocks = [];
      this.flows = [];
      
      var stocks = amplify.store("stocks");
      if (!stocks || !stocks.length) {
        this.addStock({
          x: 239,
          y: 75
        });

        this.addStock({
          x: 239,
          y: 200
        });
      } else {
        _.each(stocks, function(v, i) {
          self.addStock(v);
        });
      }
      
      var flows = amplify.store("flows");
      if (flows && flows.length) {
        _.each(flows, function(v, i) {
          var flow = self.addFlow(v);
          if (v.stocks) {
            for (var a = 0; a < 2; a++) {
              if (v.stocks[a]) {
                var stock = _.find(self.stocks, function(v2, i) {
                  return v2.id == v.stocks[a];
                });
                
                if (stock) {
                  stock.addFlow(a, flow);
                  flow.setStock(a, stock);
                }
              }
            }
          }
        });
      }
      
      $("#tools")
        .buttonset()
        .change(function(event) {
          self.mode = $(event.target).data("mode");
        });
        
      var $move = $("#move-tool");
      $move[0].checked = "checked";
      $move.button("refresh");
      this.mode = "move";
      
      $("#commands")
        .buttonset();
        
      $("#clear-command")
        .click(function() {
          _.each(self.stocks, function(v, i) {
            v.node().remove();
            v.destroy();
          });
          
          _.each(self.flows, function(v, i) {
            v.node().remove();
          });
          
          self.stocks = [];
          self.flows = [];
          self.draw();
          self.save();
        });
      
      var $run = $("#run-command")
        .click(function() {
          if (self.running) {
            self.running = false; 
            $run.find(".ui-button-text").text("Run");
          } else {
            self.running = true;
            $run.find(".ui-button-text").text("Stop");
            self.iterate();
          }
        });
        
      $("#viewport")
        .click(function(event) {
          if (self.mode != "stock") {
            return;
          }
          
          self.addStock({
            x: event.clientX,
            y: event.clientY
          });
          
          self.draw();
        })
        .mousedown(function(event) {
          if (self.mode != "flow") {
            return;
          }
          
          function checkIntersections(index, where) {             
            _.each(self.stocks, function(v, i) {
              if (v.node().getIntersections(where).length) {
                v.addFlow(index, flow);
                flow.setStock(index, v);
              }
            });
          }
          
          var where = self.getWhere(event);
          var flow = new dynamo.Flow({
            x: where.x,
            y: where.y
          });
          
          self.flowLayer.add(flow.node());
          self.draw();
          
          checkIntersections(0, where);
          
          self.drag({
            where: where,
            move: function(where) {
              flow.setPoint(1, where);
            },
            end: function(where) {
              self.flows.push(flow);
              checkIntersections(1, where);
              self.save();
            }
          });
        });
        
        this.draw();
    },
    
    addStock: function(config) {
      var stock = new dynamo.Stock(config);
      this.stockLayer.add(stock.node());
      this.stocks.push(stock);
    },

    addFlow: function(config) {
      var flow = new dynamo.Flow(config);
      this.flowLayer.add(flow.node());
      this.flows.push(flow);
      return flow;
    },
    
    remove: function(item) {
      this.stocks = _.without(this.stocks, item);
      this.flows = _.without(this.flows, item);
      item.node().remove();
      item.destroy();
      this.draw();
      this.save();
    }, 
    
    draw: function() {
      this.stage.draw();
    },
    
    save: function() {
      var self = this;
      function saveType(type) {
        var items = [];
        _.each(self[type], function(v, i) {
          items.push(v.toJSON());
        });
      
        amplify.store(type, items);
      }

      saveType("stocks");
      saveType("flows"); 
    },

    getWhere: function(event) {
      return {
        x: event.clientX,
        y: event.clientY
      };
    },
    
    drag: function(config) {
      var self = this;
      var lastWhere = config.where || this.getWhere(config.event);
      $(window).mousemove(function(event) {
        var where = self.getWhere(event);
        config.move(where, {
          x: where.x - lastWhere.x, 
          y: where.y - lastWhere.y
        });
        
        lastWhere = where;
      });
      
      $(window).mouseup(function(event) {
        $(window).unbind("mousemove");
        $(window).unbind("mouseup");
        config.end(lastWhere);
      });
    },
    
    iterate: function() {
     var self = this;
     _.each(this.flows, function(v, i) {
        var val = parseFloat(eval(v.equation));
        if (v.stocks[0]) {
          v.stocks[0].setValue(v.stocks[0].value - val);
        }
        
        if (v.stocks[1]) {
          v.stocks[1].setValue(v.stocks[1].value + val);
        }
      });
      
      this.draw();
      
      if(this.running) {
        setTimeout(function() {
          self.iterate();
        }, 500);
      }
    }
  };
  
  $(document).ready(function() {
    dynamo.init();
  });
  
})();